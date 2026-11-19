import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Terminos } from './terminos';

describe('Terminos', () => {
  let component: Terminos;
  let fixture: ComponentFixture<Terminos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Terminos],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Terminos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
