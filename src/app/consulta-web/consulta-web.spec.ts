import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsultaWeb } from './consulta-web';

describe('ConsultaWeb', () => {
  let component: ConsultaWeb;
  let fixture: ComponentFixture<ConsultaWeb>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsultaWeb],
    }).compileComponents();

    fixture = TestBed.createComponent(ConsultaWeb);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
